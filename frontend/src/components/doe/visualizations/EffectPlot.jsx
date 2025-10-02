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
  useMediaQuery
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer
} from 'recharts';

/**
 * EffectPlot component for visualizing factor effects in DOE analysis
 * 
 * @param {Object} props
 * @param {Array} props.data - Array of effect data objects
 * @param {Object} props.options - Visualization options
 */
function EffectPlot({ data, options = {} }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [sortedData, setSortedData] = useState([]);
  const [sortBy, setSortBy] = useState('magnitude');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Default configuration with overrides from props
  const config = {
    significanceThreshold: 0.05,
    barColor: theme.palette.primary.main,
    significantBarColor: theme.palette.error.main,
    barWidth: isMobile ? 15 : 30,
    ...options
  };
  
  // Process and sort data when it changes or sort option changes
  useEffect(() => {
    if (!data) return;
    
    try {
      setLoading(true);
      
      // Clone and process data
      let processedData = data.map(item => ({
        ...item,
        absoluteEffect: Math.abs(item.effect)
      }));
      
      // Apply sorting
      switch (sortBy) {
        case 'magnitude':
          processedData.sort((a, b) => b.absoluteEffect - a.absoluteEffect);
          break;
        case 'alphabetical':
          processedData.sort((a, b) => a.factor.localeCompare(b.factor));
          break;
        case 'positive':
          processedData.sort((a, b) => b.effect - a.effect);
          break;
        case 'negative':
          processedData.sort((a, b) => a.effect - b.effect);
          break;
        default:
          processedData.sort((a, b) => b.absoluteEffect - a.absoluteEffect);
      }
      
      setSortedData(processedData);
      setLoading(false);
    } catch (err) {
      console.error('Error processing effect plot data:', err);
      setError('Failed to process effect data');
      setLoading(false);
    }
  }, [data, sortBy]);
  
  // Handle sort change
  const handleSortChange = (event) => {
    setSortBy(event.target.value);
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
          No effect data available. Select an experiment to analyze.
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
  
  return (
    <Box sx={{ width: '100%', height: '100%' }}>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
        <Typography variant="subtitle1" gutterBottom>
          Factor Effects
        </Typography>
        
        <FormControl variant="outlined" size="small" sx={{ minWidth: 150 }}>
          <InputLabel id="effect-sort-label">Sort By</InputLabel>
          <Select
            labelId="effect-sort-label"
            id="effect-sort"
            value={sortBy}
            onChange={handleSortChange}
            label="Sort By"
          >
            <MenuItem value="magnitude">Magnitude</MenuItem>
            <MenuItem value="alphabetical">Alphabetical</MenuItem>
            <MenuItem value="positive">Positive Effect</MenuItem>
            <MenuItem value="negative">Negative Effect</MenuItem>
          </Select>
        </FormControl>
      </Box>
      
      {sortedData.length > 0 ? (
        <ResponsiveContainer width="100%" height={isMobile ? 350 : 400}>
          <BarChart
            data={sortedData}
            margin={{
              top: 20,
              right: 20,
              left: 20,
              bottom: 60
            }}
            barSize={config.barWidth}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="factor" 
              angle={-45} 
              textAnchor="end" 
              height={80}
              interval={0}
              tick={{ fontSize: isMobile ? 10 : 12 }}
            />
            <YAxis 
              label={{ 
                value: 'Effect Size', 
                angle: -90, 
                position: 'insideLeft',
                style: { textAnchor: 'middle' }
              }} 
            />
            <Tooltip 
              formatter={(value, name) => [value.toFixed(4), name === 'effect' ? 'Effect Size' : name]}
              labelFormatter={(label) => `Factor: ${label}`}
            />
            <Legend />
            <ReferenceLine y={0} stroke="#000" />
            {config.significanceThreshold && (
              <>
                <ReferenceLine 
                  y={config.significanceThreshold} 
                  stroke="red" 
                  strokeDasharray="3 3" 
                  label={{ value: 'Significance', position: 'right' }} 
                />
                <ReferenceLine 
                  y={-config.significanceThreshold} 
                  stroke="red" 
                  strokeDasharray="3 3" 
                />
              </>
            )}
            <Bar 
              dataKey="effect" 
              name="Effect Size" 
              fill={config.barColor}
              // Color bars differently if they exceed significance threshold
              isAnimationActive={!isMobile}
              animationDuration={500}
            />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="text.secondary">No effect data found.</Typography>
        </Box>
      )}
      
      <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
        * Bars extending beyond the red reference lines indicate statistically significant effects.
      </Typography>
    </Box>
  );
}

export default EffectPlot;