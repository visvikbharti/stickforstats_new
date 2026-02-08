/**
 * ErrorBarPanel - Error bar type and style controls
 */

import React from 'react';
import {
  Box, Typography, FormControl, InputLabel, Select, MenuItem,
  Slider, Switch, FormControlLabel
} from '@mui/material';
import { usePlotConfig } from '../../context/PlotConfigContext';

const ErrorBarPanel = () => {
  const { state, dispatch } = usePlotConfig();
  const { errorBars } = state;

  const update = (changes) => dispatch({ type: 'SET_ERROR_BARS', payload: changes });

  return (
    <Box>
      <FormControlLabel
        control={
          <Switch
            checked={errorBars.enabled}
            onChange={(e) => update({ enabled: e.target.checked })}
            size="small"
          />
        }
        label={<Typography variant="body2">Show Error Bars</Typography>}
      />

      {errorBars.enabled && (
        <Box sx={{ mt: 1 }}>
          <FormControl fullWidth size="small" sx={{ mb: 1.5 }}>
            <InputLabel>Type</InputLabel>
            <Select
              value={errorBars.type}
              label="Type"
              onChange={(e) => update({ type: e.target.value })}
            >
              <MenuItem value="sd">Standard Deviation (SD)</MenuItem>
              <MenuItem value="sem">Standard Error (SEM)</MenuItem>
              <MenuItem value="ci95">95% Confidence Interval</MenuItem>
              <MenuItem value="ci99">99% Confidence Interval</MenuItem>
            </Select>
          </FormControl>

          <Typography variant="caption" color="text.secondary">
            Cap Width: {errorBars.capWidth}px
          </Typography>
          <Slider
            value={errorBars.capWidth}
            onChange={(_, v) => update({ capWidth: v })}
            min={0}
            max={20}
            step={1}
            size="small"
            sx={{ mb: 1 }}
          />

          <Typography variant="caption" color="text.secondary">
            Line Width: {errorBars.lineWidth}px
          </Typography>
          <Slider
            value={errorBars.lineWidth}
            onChange={(_, v) => update({ lineWidth: v })}
            min={0.5}
            max={4}
            step={0.5}
            size="small"
          />
        </Box>
      )}
    </Box>
  );
};

export default ErrorBarPanel;
