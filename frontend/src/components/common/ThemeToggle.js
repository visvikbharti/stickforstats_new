import React from 'react';
import { IconButton, Tooltip } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import { useColorMode } from '../../context/ColorModeContext';

const ThemeToggle = ({ showTooltip = true, size = 'medium', ...props }) => {
  const theme = useTheme();
  const colorMode = useColorMode();

  const handleToggle = () => {
    if (colorMode && colorMode.toggleColorMode) {
      colorMode.toggleColorMode();
    }
  };

  const isDarkMode = theme.palette.mode === 'dark';
  const tooltipText = isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode';

  const button = (
    <IconButton
      onClick={handleToggle}
      color="inherit"
      size={size}
      aria-label={tooltipText}
      {...props}
    >
      {isDarkMode ? <Brightness7Icon /> : <Brightness4Icon />}
    </IconButton>
  );

  if (showTooltip) {
    return (
      <Tooltip title={tooltipText} arrow>
        {button}
      </Tooltip>
    );
  }

  return button;
};

export default ThemeToggle;