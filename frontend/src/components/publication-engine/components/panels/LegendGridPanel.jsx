/**
 * LegendGridPanel - Legend position and grid controls
 */

import React from 'react';
import {
  Box, Typography, FormControl, InputLabel, Select, MenuItem,
  Switch, FormControlLabel, Divider
} from '@mui/material';
import { usePlotConfig } from '../../context/PlotConfigContext';

const LegendGridPanel = () => {
  const { state, dispatch } = usePlotConfig();

  return (
    <Box>
      {/* Legend */}
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, mb: 0.5, display: 'block' }}>
        Legend
      </Typography>
      <FormControlLabel
        control={
          <Switch
            checked={state.legend.show}
            onChange={(e) => dispatch({ type: 'SET_LEGEND', payload: { show: e.target.checked } })}
            size="small"
          />
        }
        label={<Typography variant="body2">Show Legend</Typography>}
      />
      {state.legend.show && (
        <FormControl fullWidth size="small" sx={{ mt: 0.5, mb: 1.5 }}>
          <InputLabel>Position</InputLabel>
          <Select
            value={state.legend.position}
            label="Position"
            onChange={(e) => dispatch({ type: 'SET_LEGEND', payload: { position: e.target.value } })}
          >
            <MenuItem value="top-right">Top Right</MenuItem>
            <MenuItem value="top-left">Top Left</MenuItem>
            <MenuItem value="bottom-right">Bottom Right</MenuItem>
            <MenuItem value="bottom-left">Bottom Left</MenuItem>
            <MenuItem value="bottom">Bottom Center</MenuItem>
            <MenuItem value="top">Top Center</MenuItem>
          </Select>
        </FormControl>
      )}

      <Divider sx={{ my: 1.5 }} />

      {/* Grid */}
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, mb: 0.5, display: 'block' }}>
        Grid Lines
      </Typography>
      <FormControlLabel
        control={
          <Switch
            checked={state.grid.showX}
            onChange={(e) => dispatch({ type: 'SET_GRID', payload: { showX: e.target.checked } })}
            size="small"
          />
        }
        label={<Typography variant="body2">Vertical Grid</Typography>}
      />
      <FormControlLabel
        control={
          <Switch
            checked={state.grid.showY}
            onChange={(e) => dispatch({ type: 'SET_GRID', payload: { showY: e.target.checked } })}
            size="small"
          />
        }
        label={<Typography variant="body2">Horizontal Grid</Typography>}
      />
      <FormControl fullWidth size="small" sx={{ mt: 0.5 }}>
        <InputLabel>Style</InputLabel>
        <Select
          value={state.grid.style}
          label="Style"
          onChange={(e) => dispatch({ type: 'SET_GRID', payload: { style: e.target.value } })}
        >
          <MenuItem value="solid">Solid</MenuItem>
          <MenuItem value="dashed">Dashed</MenuItem>
          <MenuItem value="dotted">Dotted</MenuItem>
        </Select>
      </FormControl>
    </Box>
  );
};

export default LegendGridPanel;
