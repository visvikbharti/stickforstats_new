import React from 'react';
import { Chip, Box } from '@mui/material';

const KeyboardShortcutHint = ({ keys, description, ...props }) => {
  const renderKey = (key) => {
    // Convert common key names to symbols
    const keyMap = {
      'cmd': '⌘',
      'ctrl': 'Ctrl',
      'alt': 'Alt',
      'shift': '⇧',
      'enter': '↵',
      'tab': '⇥',
      'esc': 'Esc',
      'space': 'Space',
      'up': '↑',
      'down': '↓',
      'left': '←',
      'right': '→'
    };

    return keyMap[key.toLowerCase()] || key.toUpperCase();
  };

  return (
    <Box display="inline-flex" alignItems="center" gap={0.5} {...props}>
      {keys.map((key, index) => (
        <React.Fragment key={index}>
          <Chip
            label={renderKey(key)}
            size="small"
            sx={{
              height: 20,
              fontSize: '0.75rem',
              backgroundColor: 'action.hover',
              fontFamily: 'monospace',
              '& .MuiChip-label': {
                px: 1
              }
            }}
          />
          {index < keys.length - 1 && (
            <Box component="span" sx={{ color: 'text.secondary' }}>
              +
            </Box>
          )}
        </React.Fragment>
      ))}
      {description && (
        <Box component="span" sx={{ ml: 1, fontSize: '0.875rem', color: 'text.secondary' }}>
          {description}
        </Box>
      )}
    </Box>
  );
};

export default KeyboardShortcutHint;