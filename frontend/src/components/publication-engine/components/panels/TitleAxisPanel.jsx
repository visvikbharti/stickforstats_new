/**
 * TitleAxisPanel - Font, size, and label controls for title and axes
 */

import React from 'react';
import {
  Box, Typography, TextField, FormControl, InputLabel, Select, MenuItem,
  Slider, Divider, Switch, FormControlLabel, useTheme
} from '@mui/material';
import { usePlotConfig } from '../../context/PlotConfigContext';

const FONT_FAMILIES = [
  'Arial, sans-serif',
  'Helvetica, Arial, sans-serif',
  '"Times New Roman", Times, serif',
  'Georgia, serif',
  '"Courier New", monospace',
];

const FontControls = ({ label, config, onChange }) => (
  <Box sx={{ mb: 1.5 }}>
    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
      {label}
    </Typography>
    <TextField
      fullWidth
      size="small"
      label="Text"
      value={config.text || config.label || ''}
      onChange={(e) => onChange(config.text !== undefined ? { text: e.target.value } : { label: e.target.value })}
      sx={{ mt: 0.5, mb: 0.5 }}
    />
    <Box sx={{ display: 'flex', gap: 0.5 }}>
      <FormControl size="small" sx={{ flex: 2 }}>
        <InputLabel>Font</InputLabel>
        <Select
          value={config.fontFamily}
          label="Font"
          onChange={(e) => onChange({ fontFamily: e.target.value })}
        >
          {FONT_FAMILIES.map(f => (
            <MenuItem key={f} value={f} sx={{ fontFamily: f, fontSize: '0.8rem' }}>
              {f.split(',')[0].replace(/"/g, '')}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <TextField
        size="small"
        label="Size"
        type="number"
        value={config.fontSize}
        onChange={(e) => onChange({ fontSize: Number(e.target.value) })}
        sx={{ flex: 1 }}
        inputProps={{ min: 6, max: 36 }}
      />
    </Box>
    <FormControl size="small" fullWidth sx={{ mt: 0.5 }}>
      <InputLabel>Weight</InputLabel>
      <Select
        value={config.fontWeight}
        label="Weight"
        onChange={(e) => onChange({ fontWeight: e.target.value })}
      >
        <MenuItem value="normal">Normal</MenuItem>
        <MenuItem value="bold">Bold</MenuItem>
      </Select>
    </FormControl>
  </Box>
);

const AxisScaleControls = ({ label, config, onChange }) => (
  <Box sx={{ mb: 1 }}>
    <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
      <FormControl size="small" sx={{ flex: 1 }}>
        <InputLabel>Scale</InputLabel>
        <Select
          value={config.scale}
          label="Scale"
          onChange={(e) => onChange({ scale: e.target.value })}
        >
          <MenuItem value="linear">Linear</MenuItem>
          <MenuItem value="log">Log</MenuItem>
        </Select>
      </FormControl>
      <TextField
        size="small"
        label="Min"
        type="number"
        value={config.min ?? ''}
        onChange={(e) => onChange({ min: e.target.value === '' ? null : Number(e.target.value) })}
        sx={{ flex: 1 }}
        placeholder="Auto"
      />
      <TextField
        size="small"
        label="Max"
        type="number"
        value={config.max ?? ''}
        onChange={(e) => onChange({ max: e.target.value === '' ? null : Number(e.target.value) })}
        sx={{ flex: 1 }}
        placeholder="Auto"
      />
    </Box>
  </Box>
);

const TitleAxisPanel = () => {
  const { state, dispatch } = usePlotConfig();

  return (
    <Box>
      <FontControls
        label="Chart Title"
        config={state.title}
        onChange={(updates) => dispatch({ type: 'SET_TITLE', payload: updates })}
      />
      <Divider sx={{ my: 1 }} />
      <FontControls
        label="X Axis"
        config={state.xAxis}
        onChange={(updates) => dispatch({ type: 'SET_X_AXIS', payload: updates })}
      />
      <AxisScaleControls
        label="X Scale"
        config={state.xAxis}
        onChange={(updates) => dispatch({ type: 'SET_X_AXIS', payload: updates })}
      />
      <Divider sx={{ my: 1 }} />
      <FontControls
        label="Y Axis"
        config={state.yAxis}
        onChange={(updates) => dispatch({ type: 'SET_Y_AXIS', payload: updates })}
      />
      <AxisScaleControls
        label="Y Scale"
        config={state.yAxis}
        onChange={(updates) => dispatch({ type: 'SET_Y_AXIS', payload: updates })}
      />
    </Box>
  );
};

export default TitleAxisPanel;
