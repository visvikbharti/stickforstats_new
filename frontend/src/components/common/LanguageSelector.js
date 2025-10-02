import React, { useState } from 'react';
import {
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Typography,
  Box,
} from '@mui/material';
import LanguageIcon from '@mui/icons-material/Language';
import CheckIcon from '@mui/icons-material/Check';

const languages = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
];

const LanguageSelector = ({ 
  showTooltip = true, 
  size = 'medium',
  variant = 'icon',
  ...props 
}) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedLanguage, setSelectedLanguage] = useState(() => {
    const saved = localStorage.getItem('language');
    return saved || 'en';
  });

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLanguageSelect = (langCode) => {
    setSelectedLanguage(langCode);
    localStorage.setItem('language', langCode);
    handleClose();
    // In a real app, this would trigger language change
    // For now, we'll just store the preference
  };

  const currentLanguage = languages.find(lang => lang.code === selectedLanguage);

  const trigger = variant === 'icon' ? (
    <IconButton
      onClick={handleClick}
      color="inherit"
      size={size}
      aria-label="Select language"
      {...props}
    >
      <LanguageIcon />
    </IconButton>
  ) : (
    <Box
      onClick={handleClick}
      sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 1, 
        cursor: 'pointer',
        px: 1,
        py: 0.5,
        borderRadius: 1,
        '&:hover': {
          backgroundColor: 'action.hover',
        },
      }}
      {...props}
    >
      <LanguageIcon fontSize="small" />
      <Typography variant="body2">
        {currentLanguage?.nativeName}
      </Typography>
    </Box>
  );

  const button = showTooltip && variant === 'icon' ? (
    <Tooltip title="Select Language" arrow>
      {trigger}
    </Tooltip>
  ) : trigger;

  return (
    <>
      {button}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        PaperProps={{
          sx: {
            maxHeight: 400,
            width: 250,
          },
        }}
      >
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="subtitle2" color="text.secondary">
            Select Language
          </Typography>
        </Box>
        {languages.map((language) => (
          <MenuItem
            key={language.code}
            onClick={() => handleLanguageSelect(language.code)}
            selected={selectedLanguage === language.code}
          >
            <ListItemIcon>
              {selectedLanguage === language.code ? (
                <CheckIcon fontSize="small" />
              ) : (
                <Box sx={{ width: 24 }} />
              )}
            </ListItemIcon>
            <ListItemText
              primary={language.nativeName}
              secondary={language.name}
            />
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

export default LanguageSelector;