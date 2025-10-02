import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  useTheme,
  useMediaQuery,
  ToggleButtonGroup,
  ToggleButton
} from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import GridViewIcon from '@mui/icons-material/GridView';
import ViewListIcon from '@mui/icons-material/ViewList';

/**
 * InteractionPlot component for visualizing factor interactions in DOE analysis
 * 
 * @param {Object} props
 * @param {Array} props.data - Array of interaction data objects
 * @param {Object} props.options - Visualization options
 */
function InteractionPlot({ data, options = {} }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [selectedInteraction, setSelectedInteraction] = useState(null);
  const [viewMode, setViewMode] = useState('single');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Default configuration with overrides from props
  const config = {
    lineColors: [theme.palette.primary.main, theme.palette.secondary.main],
    lineWidth: 2,
    gridSize: 2, // For grid view, number of charts per row
    ...options
  };
  
  // Set the first interaction as selected when data changes
  useEffect(() => {
    if (data && data.length > 0 && !selectedInteraction) {
      setSelectedInteraction(data[0].id);
    }
  }, [data, selectedInteraction]);
  
  // Handle interaction selection change
  const handleInteractionChange = (event) => {
    setSelectedInteraction(event.target.value);
  };
  
  // Handle view mode change
  const handleViewModeChange = (event, newMode) => {
    if (newMode !== null) {
      setViewMode(newMode);
    }
  };
  
  // Get the selected interaction data
  const getSelectedInteractionData = () => {
    if (!data || !selectedInteraction) return null;
    return data.find(item => item.id === selectedInteraction);
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
          No interaction data available. Select an experiment to analyze.
        </Typography>
      </Paper>
    );
  }
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }
  
  // Render a single interaction chart
  const renderInteractionChart = (interactionData, height = 300) => {
    if (!interactionData) return null;
    
    return (
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" gutterBottom>
          {interactionData.factor1} × {interactionData.factor2}
        </Typography>
        <ResponsiveContainer width="100%" height={height}>
          <LineChart
            data={interactionData.points}
            margin={{
              top: 10,
              right: 30,
              left: 20,
              bottom: 30
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="x" 
              label={{ 
                value: interactionData.factor1, 
                position: 'bottom',
                offset: 0
              }}
            />
            <YAxis 
              label={{ 
                value: 'Response', 
                angle: -90, 
                position: 'insideLeft',
                style: { textAnchor: 'middle' }
              }} 
            />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="line1"
              name={`${interactionData.factor2} (Low)`}
              stroke={config.lineColors[0]}
              strokeWidth={config.lineWidth}
              activeDot={{ r: 8 }}
              isAnimationActive={!isMobile}
            />
            <Line
              type="monotone"
              dataKey="line2"
              name={`${interactionData.factor2} (High)`}
              stroke={config.lineColors[1]}
              strokeWidth={config.lineWidth}
              activeDot={{ r: 8 }}
              isAnimationActive={!isMobile}
            />
          </LineChart>
        </ResponsiveContainer>
        {interactionData.pValue && (
          <Typography variant="caption" color="text.secondary">
            P-value: {interactionData.pValue.toFixed(4)}
            {interactionData.pValue < 0.05 ? ' (Significant)' : ' (Not significant)'}
          </Typography>
        )}
      </Box>
    );
  };
  
  // Grid view - show multiple interaction charts
  const renderGridView = () => {
    return (
      <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${isMobile ? 1 : config.gridSize}, 1fr)`, gap: 3 }}>
        {data.slice(0, 4).map(interaction => (
          <Box key={interaction.id} sx={{ height: 300 }}>
            {renderInteractionChart(interaction, 250)}
          </Box>
        ))}
      </Box>
    );
  };
  
  return (
    <Box sx={{ width: '100%', height: '100%' }}>
      <Box sx={{ 
        mb: 2, 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        flexWrap: 'wrap',
        gap: 2
      }}>
        <Typography variant="subtitle1">
          Factor Interactions
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          {viewMode === 'single' && (
            <FormControl variant="outlined" size="small" sx={{ minWidth: 200 }}>
              <InputLabel id="interaction-select-label">Select Interaction</InputLabel>
              <Select
                labelId="interaction-select-label"
                id="interaction-select"
                value={selectedInteraction || ''}
                onChange={handleInteractionChange}
                label="Select Interaction"
              >
                {data.map(interaction => (
                  <MenuItem key={interaction.id} value={interaction.id}>
                    {interaction.factor1} × {interaction.factor2}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={handleViewModeChange}
            aria-label="view mode"
            size="small"
          >
            <ToggleButton value="single" aria-label="single view">
              <ViewListIcon />
            </ToggleButton>
            <ToggleButton value="grid" aria-label="grid view">
              <GridViewIcon />
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>
      
      {viewMode === 'single' ? (
        renderInteractionChart(getSelectedInteractionData())
      ) : (
        renderGridView()
      )}
      
      <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
        * Non-parallel lines indicate an interaction between factors.
        The more non-parallel the lines, the stronger the interaction.
      </Typography>
    </Box>
  );
}

export default InteractionPlot;