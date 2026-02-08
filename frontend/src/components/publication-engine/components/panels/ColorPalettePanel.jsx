/**
 * ColorPalettePanel - Palette selector with visual preview
 */

import React from 'react';
import { Box, Typography, ButtonBase, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { usePlotConfig } from '../../context/PlotConfigContext';
import { COLOR_PALETTES } from '../../utils/colorPalettes';

const PalettePreview = ({ name, colors, isSelected, onClick }) => {
  const theme = useTheme();
  return (
    <ButtonBase
      onClick={onClick}
      sx={{
        width: '100%',
        p: 1,
        borderRadius: 1,
        border: isSelected
          ? `2px solid ${theme.palette.primary.main}`
          : `1px solid ${theme.palette.divider}`,
        bgcolor: isSelected ? alpha(theme.palette.primary.main, 0.06) : 'transparent',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        mb: 0.5,
        '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.03) },
      }}
    >
      <Typography variant="caption" sx={{ fontWeight: isSelected ? 600 : 400, mb: 0.5 }}>
        {name}
      </Typography>
      <Box sx={{ display: 'flex', gap: '2px' }}>
        {colors.slice(0, 8).map((color, i) => (
          <Box
            key={i}
            sx={{
              width: 20,
              height: 14,
              borderRadius: 0.5,
              bgcolor: color,
            }}
          />
        ))}
      </Box>
    </ButtonBase>
  );
};

const ColorPalettePanel = () => {
  const { state, dispatch } = usePlotConfig();

  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, mb: 1, display: 'block' }}>
        Color Palette
      </Typography>
      {Object.entries(COLOR_PALETTES).map(([id, palette]) => (
        <PalettePreview
          key={id}
          name={palette.name}
          colors={palette.colors}
          isSelected={state.colorPalette === id}
          onClick={() => dispatch({ type: 'SET_COLOR_PALETTE', payload: id })}
        />
      ))}
    </Box>
  );
};

export default ColorPalettePanel;
