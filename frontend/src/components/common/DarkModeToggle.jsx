import React from 'react';
import { IconButton, Tooltip } from '@mui/material';
import { DarkMode as DarkModeIcon, LightMode as LightModeIcon } from '@mui/icons-material';
import { useDarkMode } from '../../context/DarkModeContext';

const DarkModeToggle = ({ showLabel = false }) => {
  const { darkMode, toggleDarkMode } = useDarkMode();

  return (
    <Tooltip title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
      <IconButton
        onClick={toggleDarkMode}
        color="inherit"
        aria-label="toggle dark mode"
        sx={{
          transition: 'all 0.3s ease',
          '&:hover': {
            backgroundColor: darkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
            transform: 'rotate(180deg)'
          }
        }}
      >
        {darkMode ? (
          <LightModeIcon sx={{ color: '#FFD700' }} />
        ) : (
          <DarkModeIcon sx={{ color: '#1a1a1a' }} />
        )}
      </IconButton>
    </Tooltip>
  );
};

export default DarkModeToggle;