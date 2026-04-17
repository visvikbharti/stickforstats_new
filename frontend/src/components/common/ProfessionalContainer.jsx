/**
 * ProfessionalContainer
 * =====================
 * Standardized wrapper for statistical modules. Provides a flat, solid
 * surface that matches the app's Professional Research Software aesthetic.
 *
 * This component no longer creates its own ThemeProvider — it relies on the
 * single MUI theme supplied by `AppThemeProvider`. The legacy exports
 * (`gradients`, `glassMorphism`, `neumorphism`) are retained for source
 * compatibility with existing modules, but they now resolve to flat, solid
 * styling (no gradients, no backdrop blur, no embossed effects).
 */

import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  IconButton,
  Tooltip,
  useTheme,
} from '@mui/material';
import {
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
} from '@mui/icons-material';
import { useDarkMode } from '../../context/DarkModeContext';
import { palette } from '../../theme';

const solid = (mode) => {
  const c = mode === 'dark' ? palette.dark : palette.light;
  return {
    primary: c.primary,
    secondary: c.secondary,
    success: c.success,
    info: c.info,
    warning: c.warning,
    error: c.error,
    surface: c.bgPaper,
    subtle: c.bgSubtle,
    text: c.textPrimary,
  };
};

/**
 * Legacy `gradients` export — now returns solid colors so existing
 * `background: gradients.primary` usage produces a flat fill.
 */
const light = solid('light');
export const gradients = {
  primary: light.primary,
  success: light.success,
  info: light.info,
  warning: light.warning,
  dark: light.text,
  ocean: light.info,
  sunset: light.warning,
  forest: light.success,
  night: light.text,
  space: light.text,
};

/**
 * Legacy `glassMorphism` export — now returns flat Paper styling.
 */
export const glassMorphism = {
  light: {
    background: palette.light.bgPaper,
    backdropFilter: 'none',
    border: `1px solid ${palette.light.border}`,
    boxShadow: 'none',
  },
  dark: {
    background: palette.dark.bgPaper,
    backdropFilter: 'none',
    border: `1px solid ${palette.dark.border}`,
    boxShadow: 'none',
  },
};

/**
 * Legacy `neumorphism` export — now a no-op.
 */
export const neumorphism = {
  light: { background: palette.light.bgPaper, boxShadow: 'none' },
  dark: { background: palette.dark.bgPaper, boxShadow: 'none' },
};

const ProfessionalContainer = ({
  children,
  title,
  showDarkModeToggle = true,
  showFullscreen = true,
  maxWidth = 'xl',
  disableGutters = false,
  customActions = null,
  // Accepted for API compatibility — no longer used.
  // eslint-disable-next-line no-unused-vars
  gradient = 'primary',
  // eslint-disable-next-line no-unused-vars
  enableGlassMorphism = true,
  // eslint-disable-next-line no-unused-vars
  enableNeumorphism = false,
}) => {
  const theme = useTheme();
  const { darkMode, toggleDarkMode } = useDarkMode();
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: theme.palette.background.default,
        color: theme.palette.text.primary,
      }}
    >
      {/* Floating action buttons */}
      <Box
        sx={{
          position: 'fixed',
          top: 12,
          right: 12,
          zIndex: theme.zIndex.appBar + 1,
          display: 'flex',
          gap: 0.5,
          backgroundColor: theme.palette.background.paper,
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 1,
          padding: '4px',
          boxShadow: darkMode ? '0 2px 6px rgba(0,0,0,0.4)' : '0 1px 3px rgba(15,23,42,0.08)',
        }}
      >
        {customActions}

        {showFullscreen && (
          <Tooltip title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
            <IconButton size="small" onClick={toggleFullscreen} aria-label="Toggle fullscreen">
              {isFullscreen ? <FullscreenExitIcon fontSize="small" /> : <FullscreenIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
        )}

        {showDarkModeToggle && (
          <Tooltip title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}>
            <IconButton size="small" onClick={toggleDarkMode} aria-label="Toggle dark mode">
              {darkMode ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
        )}
      </Box>

      <Container
        maxWidth={maxWidth}
        disableGutters={disableGutters}
        sx={{ pt: 3, pb: 4 }}
      >
        {title && <Box sx={{ mb: 3 }}>{title}</Box>}
        {children}
      </Container>
    </Box>
  );
};

export default ProfessionalContainer;
