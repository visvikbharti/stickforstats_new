import React from 'react';
import { MenuItem, Box, Typography } from '@mui/material';
import KeyboardShortcutHint from './KeyboardShortcutHint';

const MenuItemWithShortcut = ({ 
  onClick, 
  children, 
  shortcutKeys, 
  disabled = false,
  ...props 
}) => {
  return (
    <MenuItem onClick={onClick} disabled={disabled} {...props}>
      <Box display="flex" justifyContent="space-between" alignItems="center" width="100%">
        <Typography>{children}</Typography>
        {shortcutKeys && (
          <Box ml={4}>
            <KeyboardShortcutHint keys={shortcutKeys} />
          </Box>
        )}
      </Box>
    </MenuItem>
  );
};

export default MenuItemWithShortcut;