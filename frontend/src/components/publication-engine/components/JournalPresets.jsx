/**
 * JournalPresets - One-click journal formatting presets
 */

import React from 'react';
import { Box, Typography, Chip, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { usePlotConfig } from '../context/PlotConfigContext';
import { JOURNAL_PRESETS, applyPreset } from '../utils/journalPresets';

const JournalPresets = () => {
  const theme = useTheme();
  const { state, dispatch } = usePlotConfig();

  const handleApply = (presetId) => {
    const presetValues = applyPreset(presetId);
    if (presetValues) {
      dispatch({ type: 'APPLY_JOURNAL_PRESET', payload: presetValues });
    }
  };

  return (
    <Box sx={{ mb: 1.5 }}>
      <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
        Journal Presets
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
        {Object.entries(JOURNAL_PRESETS).map(([id, preset]) => (
          <Chip
            key={id}
            label={preset.name}
            size="small"
            variant={state.journalPreset === id ? 'filled' : 'outlined'}
            color={state.journalPreset === id ? 'primary' : 'default'}
            onClick={() => handleApply(id)}
            sx={{ fontSize: '0.65rem', height: 24 }}
          />
        ))}
      </Box>
    </Box>
  );
};

export default JournalPresets;
