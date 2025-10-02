import React, { useEffect, useState, useRef } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  Legend, ResponsiveContainer, ReferenceLine, Scatter
} from 'recharts';
import { 
  Card, CardContent, Typography, Grid, Box, 
  Tabs, Tab, Paper, Divider, Chip, CircularProgress
} from '@mui/material';
import { styled } from '@mui/material/styles';

// Styled components
const StyledCard = styled(Card)(({ theme }) => ({
  height: '100%',
  borderRadius: theme.shape.borderRadius * 2,
  boxShadow: theme.shadows[3],
  '&:hover': {
    boxShadow: theme.shadows[6],
  },
}));

const ChartContainer = styled(Box)(({ theme }) => ({
  height: 400,
  margin: theme.spacing(2, 0),
}));

const ViolationChip = styled(Chip)(({ theme }) => ({
  margin: theme.spacing(0.5),
  backgroundColor: theme.palette.error.light,
}));

const InterpretationBox = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  backgroundColor: theme.palette.background.paper,
  borderLeft: `4px solid ${theme.palette.primary.main}`,
  marginTop: theme.spacing(2),
}));

/**
 * Control Chart Visualization Component
 * 
 * Displays interactive control charts for SQC analysis results
 * 
 * @param {Object} props Component props
 * @param {Object} props.chartData Data for the control chart
 * @param {string} props.chartType Type of control chart
 * @param {Function} props.onPointClick Callback for when a point is clicked
 */
const ControlChartVisualization = ({ 
  chartData, 
  chartType, 
  onPointClick,
  isLoading = false
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [chartKey, setChartKey] = useState(0); // For forcing re-render
  
  // Force chart re-render when data changes
  useEffect(() => {
    setChartKey(prevKey => prevKey + 1);
  }, [chartData]);
  
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };
  
  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="400px">
        <CircularProgress />
      </Box>
    );
  }
  
  if (!chartData) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="400px">
        <Typography variant="h6" color="textSecondary">
          No chart data available
        </Typography>
      </Box>
    );
  }

  // Prepare the control chart based on chart type
  const renderControlChart = () => {
    // Data preparation for different chart types
    switch (chartType) {
      case 'xbar_r':
        return renderXbarRChart();
      case 'xbar_s':
        return renderXbarSChart();
      case 'i_mr':
        return renderIMRChart();
      case 'p':
        return renderPChart();
      default:
        return (
          <Typography variant="body1" color="error">
            Unsupported chart type: {chartType}
          </Typography>
        );
    }
  };

  // Helper function to identify rule violations for visualization
  const getViolationPoints = (violations, dataPoints) => {
    if (!violations || violations.length === 0) return [];
    
    return violations.map(([pointIndex, ruleNumber]) => ({
      ...dataPoints[pointIndex],
      pointIndex,
      ruleNumber,
    }));
  };

  // X-bar and R chart rendering
  const renderXbarRChart = () => {
    const { 
      x_data, xbar_values, range_values, x_center_line, 
      x_ucl, x_lcl, r_center_line, r_ucl, r_lcl,
      subgroup_labels, x_violations, r_violations 
    } = chartData.plot_data;

    // Prepare data for X-bar chart
    const xbarChartData = x_data.map((x, idx) => ({
      x: subgroup_labels ? subgroup_labels[idx] : x,
      xbar: xbar_values[idx],
    }));

    // Prepare data for R chart
    const rChartData = x_data.map((x, idx) => ({
      x: subgroup_labels ? subgroup_labels[idx] : x,
      range: range_values[idx],
    }));

    // Get violation points for highlighting
    const xbarViolationPoints = getViolationPoints(x_violations, xbarChartData);
    const rViolationPoints = getViolationPoints(r_violations, rChartData);

    return (
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Tabs 
            value={activeTab} 
            onChange={handleTabChange} 
            centered
            variant="fullWidth"
          >
            <Tab label="X-bar Chart" />
            <Tab label="R Chart" />
          </Tabs>
        </Grid>
        
        <Grid item xs={12}>
          {activeTab === 0 ? (
            <StyledCard>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  X-bar Chart
                </Typography>
                <ChartContainer>
                  <ResponsiveContainer width="100%" height="100%" key={`xbar-${chartKey}`}>
                    <LineChart data={xbarChartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="x" 
                        label={{ value: 'Subgroup', position: 'insideBottom', offset: -10 }} 
                      />
                      <YAxis 
                        label={{ value: 'Subgroup Mean', angle: -90, position: 'insideLeft' }} 
                      />
                      <Tooltip formatter={(value) => [value.toFixed(4), 'Value']} />
                      <Legend />
                      
                      {/* Control limits */}
                      <ReferenceLine y={x_center_line} stroke="#888" strokeDasharray="3 3" label="CL" />
                      <ReferenceLine y={x_ucl} stroke="#ff4444" label="UCL" />
                      <ReferenceLine y={x_lcl} stroke="#ff4444" label="LCL" />
                      
                      {/* Chart Line */}
                      <Line 
                        type="monotone" 
                        dataKey="xbar" 
                        stroke="#3f51b5" 
                        activeDot={{ r: 8, onClick: (data) => onPointClick && onPointClick(data, 'xbar') }} 
                      />
                      
                      {/* Violation points */}
                      {xbarViolationPoints.length > 0 && (
                        <Scatter
                          data={xbarViolationPoints}
                          fill="#ff4444"
                          shape="star"
                          dataKey="xbar"
                        />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
                
                {/* X-bar rule violations */}
                {x_violations && x_violations.length > 0 && (
                  <Box mt={2}>
                    <Typography variant="subtitle2" color="error" gutterBottom>
                      Rule Violations Detected
                    </Typography>
                    <Box display="flex" flexWrap="wrap">
                      {x_violations.map(([pointIdx, ruleNum], idx) => (
                        <ViolationChip 
                          key={`${pointIdx}-${ruleNum}-${idx}`}
                          label={`Subgroup ${pointIdx + 1}: Rule ${ruleNum}`}
                          size="small"
                        />
                      ))}
                    </Box>
                  </Box>
                )}
              </CardContent>
            </StyledCard>
          ) : (
            <StyledCard>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  R Chart
                </Typography>
                <ChartContainer>
                  <ResponsiveContainer width="100%" height="100%" key={`r-${chartKey}`}>
                    <LineChart data={rChartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="x" 
                        label={{ value: 'Subgroup', position: 'insideBottom', offset: -10 }} 
                      />
                      <YAxis 
                        label={{ value: 'Range', angle: -90, position: 'insideLeft' }} 
                      />
                      <Tooltip formatter={(value) => [value.toFixed(4), 'Value']} />
                      <Legend />
                      
                      {/* Control limits */}
                      <ReferenceLine y={r_center_line} stroke="#888" strokeDasharray="3 3" label="CL" />
                      <ReferenceLine y={r_ucl} stroke="#ff4444" label="UCL" />
                      <ReferenceLine y={r_lcl} stroke="#ff4444" label="LCL" />
                      
                      {/* Chart Line */}
                      <Line 
                        type="monotone" 
                        dataKey="range" 
                        stroke="#f50057" 
                        activeDot={{ r: 8, onClick: (data) => onPointClick && onPointClick(data, 'range') }} 
                      />
                      
                      {/* Violation points */}
                      {rViolationPoints.length > 0 && (
                        <Scatter
                          data={rViolationPoints}
                          fill="#ff4444"
                          shape="star"
                          dataKey="range"
                        />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
                
                {/* R chart rule violations */}
                {r_violations && r_violations.length > 0 && (
                  <Box mt={2}>
                    <Typography variant="subtitle2" color="error" gutterBottom>
                      Rule Violations Detected
                    </Typography>
                    <Box display="flex" flexWrap="wrap">
                      {r_violations.map(([pointIdx, ruleNum], idx) => (
                        <ViolationChip 
                          key={`${pointIdx}-${ruleNum}-${idx}`}
                          label={`Subgroup ${pointIdx + 1}: Rule ${ruleNum}`}
                          size="small"
                        />
                      ))}
                    </Box>
                  </Box>
                )}
              </CardContent>
            </StyledCard>
          )}
        </Grid>
      </Grid>
    );
  };

  // I-MR chart rendering
  const renderIMRChart = () => {
    const { 
      x_data, individual_values, moving_ranges, i_center_line, 
      i_ucl, i_lcl, mr_center_line, mr_ucl, mr_lcl,
      i_violations, mr_violations, autocorrelation
    } = chartData.plot_data;

    // Prepare data for I chart
    const iChartData = x_data.map((x, idx) => ({
      x: typeof x === 'string' ? x : `Point ${idx + 1}`,
      individual: individual_values[idx],
    }));

    // Prepare data for MR chart
    const mrChartData = x_data.map((x, idx) => ({
      x: typeof x === 'string' ? x : `Point ${idx + 1}`,
      mr: moving_ranges[idx],
    }));

    // Get violation points for highlighting
    const iViolationPoints = getViolationPoints(i_violations, iChartData);
    const mrViolationPoints = getViolationPoints(mr_violations, mrChartData);

    return (
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Tabs 
            value={activeTab} 
            onChange={handleTabChange} 
            centered
            variant="fullWidth"
          >
            <Tab label="Individuals Chart" />
            <Tab label="Moving Range Chart" />
          </Tabs>
        </Grid>
        
        {autocorrelation !== null && Math.abs(autocorrelation) > 0.3 && (
          <Grid item xs={12}>
            <Box 
              p={2} 
              bgcolor={Math.abs(autocorrelation) > 0.5 ? 'error.light' : 'warning.light'} 
              borderRadius={1}
            >
              <Typography variant="subtitle2">
                {Math.abs(autocorrelation) > 0.5 
                  ? 'Warning: Strong autocorrelation detected.' 
                  : 'Caution: Moderate autocorrelation detected.'}
              </Typography>
              <Typography variant="body2">
                Autocorrelation coefficient: {autocorrelation.toFixed(4)}
              </Typography>
            </Box>
          </Grid>
        )}
        
        <Grid item xs={12}>
          {activeTab === 0 ? (
            <StyledCard>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Individuals Chart
                </Typography>
                <ChartContainer>
                  <ResponsiveContainer width="100%" height="100%" key={`i-${chartKey}`}>
                    <LineChart data={iChartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="x" 
                        label={{ value: 'Observation', position: 'insideBottom', offset: -10 }} 
                      />
                      <YAxis 
                        label={{ value: 'Individual Value', angle: -90, position: 'insideLeft' }} 
                      />
                      <Tooltip formatter={(value) => [value.toFixed(4), 'Value']} />
                      <Legend />
                      
                      {/* Control limits */}
                      <ReferenceLine y={i_center_line} stroke="#888" strokeDasharray="3 3" label="CL" />
                      <ReferenceLine y={i_ucl} stroke="#ff4444" label="UCL" />
                      <ReferenceLine y={i_lcl} stroke="#ff4444" label="LCL" />
                      
                      {/* Chart Line */}
                      <Line 
                        type="monotone" 
                        dataKey="individual" 
                        stroke="#3f51b5" 
                        activeDot={{ r: 8, onClick: (data) => onPointClick && onPointClick(data, 'individual') }} 
                      />
                      
                      {/* Violation points */}
                      {iViolationPoints.length > 0 && (
                        <Scatter
                          data={iViolationPoints}
                          fill="#ff4444"
                          shape="star"
                          dataKey="individual"
                        />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
                
                {/* I chart rule violations */}
                {i_violations && i_violations.length > 0 && (
                  <Box mt={2}>
                    <Typography variant="subtitle2" color="error" gutterBottom>
                      Rule Violations Detected
                    </Typography>
                    <Box display="flex" flexWrap="wrap">
                      {i_violations.map(([pointIdx, ruleNum], idx) => (
                        <ViolationChip 
                          key={`${pointIdx}-${ruleNum}-${idx}`}
                          label={`Point ${pointIdx + 1}: Rule ${ruleNum}`}
                          size="small"
                        />
                      ))}
                    </Box>
                  </Box>
                )}
              </CardContent>
            </StyledCard>
          ) : (
            <StyledCard>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Moving Range Chart
                </Typography>
                <ChartContainer>
                  <ResponsiveContainer width="100%" height="100%" key={`mr-${chartKey}`}>
                    <LineChart data={mrChartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="x" 
                        label={{ value: 'Observation', position: 'insideBottom', offset: -10 }} 
                      />
                      <YAxis 
                        label={{ value: 'Moving Range', angle: -90, position: 'insideLeft' }} 
                      />
                      <Tooltip formatter={(value) => value === null ? ['N/A', 'Value'] : [value.toFixed(4), 'Value']} />
                      <Legend />
                      
                      {/* Control limits */}
                      <ReferenceLine y={mr_center_line} stroke="#888" strokeDasharray="3 3" label="CL" />
                      <ReferenceLine y={mr_ucl} stroke="#ff4444" label="UCL" />
                      <ReferenceLine y={mr_lcl} stroke="#ff4444" label="LCL" />
                      
                      {/* Chart Line */}
                      <Line 
                        type="monotone" 
                        dataKey="mr" 
                        stroke="#f50057" 
                        activeDot={{ r: 8, onClick: (data) => onPointClick && onPointClick(data, 'mr') }} 
                        connectNulls={true}
                      />
                      
                      {/* Violation points */}
                      {mrViolationPoints.length > 0 && (
                        <Scatter
                          data={mrViolationPoints.filter(point => point.mr !== null)}
                          fill="#ff4444"
                          shape="star"
                          dataKey="mr"
                        />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
                
                {/* MR chart rule violations */}
                {mr_violations && mr_violations.length > 0 && (
                  <Box mt={2}>
                    <Typography variant="subtitle2" color="error" gutterBottom>
                      Rule Violations Detected
                    </Typography>
                    <Box display="flex" flexWrap="wrap">
                      {mr_violations.map(([pointIdx, ruleNum], idx) => (
                        <ViolationChip 
                          key={`${pointIdx}-${ruleNum}-${idx}`}
                          label={`Point ${pointIdx + 1}: Rule ${ruleNum}`}
                          size="small"
                        />
                      ))}
                    </Box>
                  </Box>
                )}
              </CardContent>
            </StyledCard>
          )}
        </Grid>
      </Grid>
    );
  };
  
  // Other chart type implementations would go here
  const renderXbarSChart = () => {
    // Implementation similar to X-bar R chart but with standard deviation
    return <Typography>X-bar S Chart implementation</Typography>;
  };
  
  const renderPChart = () => {
    // Implementation for p chart
    return <Typography>P Chart implementation</Typography>;
  };

  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        {renderControlChart()}
      </Grid>
      
      {/* Chart interpretation section */}
      {chartData.chart_interpretation && (
        <Grid item xs={12}>
          <InterpretationBox>
            <Typography variant="h6" gutterBottom>
              Chart Interpretation
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="body1" component="div" sx={{ whiteSpace: 'pre-line' }}>
              {chartData.chart_interpretation}
            </Typography>
          </InterpretationBox>
        </Grid>
      )}
    </Grid>
  );
};

export default ControlChartVisualization;