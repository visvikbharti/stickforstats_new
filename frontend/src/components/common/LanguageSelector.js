/**
 * Language Selector Component
 *
 * Provides UI for switching between supported languages.
 * Integrates with react-i18next for actual language changes.
 *
 * @author StickForStats Team
 * @version 2.0.0
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Typography,
  Box,
  Divider,
} from '@mui/material';
import LanguageIcon from '@mui/icons-material/Language';
import CheckIcon from '@mui/icons-material/Check';
import TranslateIcon from '@mui/icons-material/Translate';

import { SUPPORTED_LANGUAGES, changeLanguage, getCurrentLanguage } from '../../i18n';

/**
 * Language Selector dropdown component
 * @param {Object} props - Component props
 * @param {boolean} props.showTooltip - Show tooltip on hover
 * @param {string} props.size - Icon size (small, medium, large)
 * @param {string} props.variant - Variant type (icon, text, compact)
 * @param {boolean} props.showFlag - Show flag emoji
 */
const LanguageSelector = ({
  showTooltip = true,
  size = 'medium',
  variant = 'icon',
  showFlag = true,
  ...props
}) => {
  const { t, i18n } = useTranslation('common');
  const [anchorEl, setAnchorEl] = useState(null);

  const currentLangCode = i18n.language || getCurrentLanguage();
  const currentLanguage = SUPPORTED_LANGUAGES.find(lang => lang.code === currentLangCode) || SUPPORTED_LANGUAGES[0];

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLanguageSelect = (langCode) => {
    changeLanguage(langCode);
    handleClose();
  };

  // Icon-only trigger
  const iconTrigger = (
    <IconButton
      onClick={handleClick}
      color="inherit"
      size={size}
      aria-label={t('language')}
      aria-haspopup="true"
      aria-expanded={Boolean(anchorEl)}
      {...props}
    >
      <LanguageIcon />
    </IconButton>
  );

  // Text trigger with native language name
  const textTrigger = (
    <Box
      onClick={handleClick}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        cursor: 'pointer',
        px: 1.5,
        py: 0.75,
        borderRadius: 1,
        '&:hover': {
          backgroundColor: 'action.hover',
        },
      }}
      role="button"
      aria-label={t('language')}
      aria-haspopup="true"
      aria-expanded={Boolean(anchorEl)}
      {...props}
    >
      {showFlag && (
        <Typography component="span" sx={{ fontSize: '1.2rem' }}>
          {currentLanguage.flag}
        </Typography>
      )}
      <Typography variant="body2" sx={{ fontWeight: 500 }}>
        {currentLanguage.nativeName}
      </Typography>
    </Box>
  );

  // Compact trigger with flag and icon
  const compactTrigger = (
    <Box
      onClick={handleClick}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        cursor: 'pointer',
        px: 1,
        py: 0.5,
        borderRadius: 1,
        border: '1px solid',
        borderColor: 'divider',
        '&:hover': {
          backgroundColor: 'action.hover',
          borderColor: 'primary.main',
        },
      }}
      role="button"
      aria-label={t('language')}
      aria-haspopup="true"
      aria-expanded={Boolean(anchorEl)}
      {...props}
    >
      {showFlag && (
        <Typography component="span" sx={{ fontSize: '1rem' }}>
          {currentLanguage.flag}
        </Typography>
      )}
      <Typography variant="caption" sx={{ fontWeight: 500, textTransform: 'uppercase' }}>
        {currentLanguage.code}
      </Typography>
    </Box>
  );

  // Select trigger based on variant
  const getTrigger = () => {
    switch (variant) {
      case 'text':
        return textTrigger;
      case 'compact':
        return compactTrigger;
      default:
        return iconTrigger;
    }
  };

  const trigger = getTrigger();

  // Wrap in tooltip if enabled and using icon variant
  const button = showTooltip && variant === 'icon' ? (
    <Tooltip title={t('language')} arrow>
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
          elevation: 3,
          sx: {
            maxHeight: 400,
            width: 280,
            mt: 1,
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {/* Header */}
        <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
          <TranslateIcon fontSize="small" color="primary" />
          <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600 }}>
            {t('language')}
          </Typography>
        </Box>
        <Divider />

        {/* Language options */}
        {SUPPORTED_LANGUAGES.map((language) => (
          <MenuItem
            key={language.code}
            onClick={() => handleLanguageSelect(language.code)}
            selected={currentLangCode === language.code}
            sx={{
              py: 1.25,
              '&.Mui-selected': {
                backgroundColor: 'primary.light',
                '&:hover': {
                  backgroundColor: 'primary.light',
                },
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 36 }}>
              {currentLangCode === language.code ? (
                <CheckIcon fontSize="small" color="primary" />
              ) : (
                <Typography component="span" sx={{ fontSize: '1.2rem' }}>
                  {language.flag}
                </Typography>
              )}
            </ListItemIcon>
            <ListItemText
              primary={
                <Typography variant="body2" sx={{ fontWeight: currentLangCode === language.code ? 600 : 400 }}>
                  {language.nativeName}
                </Typography>
              }
              secondary={
                <Typography variant="caption" color="text.secondary">
                  {language.name}
                </Typography>
              }
            />
            {currentLangCode === language.code && (
              <Typography component="span" sx={{ fontSize: '1.2rem', ml: 1 }}>
                {language.flag}
              </Typography>
            )}
          </MenuItem>
        ))}

        {/* Footer with info */}
        <Divider />
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="caption" color="text.secondary">
            6 languages supported
          </Typography>
        </Box>
      </Menu>
    </>
  );
};

export default LanguageSelector;
