import React from 'react';
import { Tooltip, Box, IconButton } from '@mui/material';
import { HelpOutline as HelpIcon } from '@mui/icons-material';

const OnboardingTooltip = ({ 
  children, 
  title, 
  placement = 'top',
  showHelpIcon = false,
  ...props 
}) => {
  if (showHelpIcon) {
    return (
      <Box display="inline-flex" alignItems="center">
        {children}
        <Tooltip title={title} placement={placement} {...props}>
          <IconButton size="small" sx={{ ml: 0.5 }}>
            <HelpIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    );
  }

  return (
    <Tooltip title={title} placement={placement} {...props}>
      {children}
    </Tooltip>
  );
};

export default OnboardingTooltip;