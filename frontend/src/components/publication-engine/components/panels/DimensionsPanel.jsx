/**
 * DimensionsPanel - Width, height, DPI, and aspect ratio controls
 */

import React from 'react';
import {
  Box, Typography, TextField, FormControl, InputLabel, Select, MenuItem,
  Switch, FormControlLabel, Chip, Divider
} from '@mui/material';
import { usePlotConfig } from '../../context/PlotConfigContext';

const SIZE_PRESETS = [
  { label: 'Single Column', width: 3.5, height: 2.5, desc: '3.5" x 2.5"' },
  { label: 'Double Column', width: 7.0, height: 4.5, desc: '7.0" x 4.5"' },
  { label: '1.5 Column', width: 5.5, height: 3.5, desc: '5.5" x 3.5"' },
  { label: 'Square', width: 4.0, height: 4.0, desc: '4.0" x 4.0"' },
];

const DimensionsPanel = () => {
  const { state, dispatch } = usePlotConfig();
  const { dimensions } = state;

  const update = (changes) => dispatch({ type: 'SET_DIMENSIONS', payload: changes });

  const applyPreset = (preset) => {
    update({ width: preset.width, height: preset.height });
  };

  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, mb: 0.5, display: 'block' }}>
        Size Presets
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1.5 }}>
        {SIZE_PRESETS.map(p => (
          <Chip
            key={p.label}
            label={p.label}
            size="small"
            variant={dimensions.width === p.width && dimensions.height === p.height ? 'filled' : 'outlined'}
            color={dimensions.width === p.width && dimensions.height === p.height ? 'primary' : 'default'}
            onClick={() => applyPreset(p)}
            sx={{ fontSize: '0.65rem', height: 22 }}
          />
        ))}
      </Box>

      <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
        <TextField
          size="small"
          label="Width (in)"
          type="number"
          value={dimensions.width}
          onChange={(e) => update({ width: Number(e.target.value) })}
          inputProps={{ min: 1, max: 20, step: 0.25 }}
          sx={{ flex: 1 }}
        />
        <TextField
          size="small"
          label="Height (in)"
          type="number"
          value={dimensions.height}
          onChange={(e) => update({ height: Number(e.target.value) })}
          inputProps={{ min: 1, max: 20, step: 0.25 }}
          sx={{ flex: 1 }}
        />
      </Box>

      <Divider sx={{ my: 1.5 }} />

      <FormControl fullWidth size="small">
        <InputLabel>Export DPI</InputLabel>
        <Select
          value={dimensions.dpi}
          label="Export DPI"
          onChange={(e) => update({ dpi: Number(e.target.value) })}
        >
          <MenuItem value={150}>150 DPI (Screen)</MenuItem>
          <MenuItem value={300}>300 DPI (Print)</MenuItem>
          <MenuItem value={600}>600 DPI (High Quality)</MenuItem>
          <MenuItem value={1200}>1200 DPI (Ultra)</MenuItem>
        </Select>
      </FormControl>

      <Box sx={{ mt: 1.5, p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
        <Typography variant="caption" color="text.secondary">
          Export size: {Math.round(dimensions.width * dimensions.dpi)} x {Math.round(dimensions.height * dimensions.dpi)} px
        </Typography>
      </Box>
    </Box>
  );
};

export default DimensionsPanel;
