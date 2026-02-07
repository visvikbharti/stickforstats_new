import React from 'react';
import { IconButton, Tooltip, useTheme } from '@mui/material';
import { DarkMode as DarkModeIcon, LightMode as LightModeIcon } from '@mui/icons-material';
import { useDarkMode } from '../../context/DarkModeContext';

const DarkModeToggle = ({ showLabel = false }) => {
  const { darkMode, toggleDarkMode } = useDarkMode();
  const theme = useTheme();

  return (
    <Tooltip title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
      <IconButton
        onClick={toggleDarkMode}
        color="inherit"
        aria-label="toggle dark mode"
        sx={{
          transition: 'all 0.3s ease',
          '&:hover': {
            backgroundColor: theme.palette.action.hover,
            transform: 'rotate(180deg)'
          }
        }}
      >
        {darkMode ? (
          <LightModeIcon sx={{ color: theme.palette.warning.main }} />
        ) : (
          <DarkModeIcon sx={{ color: theme.palette.text.primary }} />
        )}
      </IconButton>
    </Tooltip>
  );
};

export default DarkModeToggle;