import React, { createContext, useContext, useMemo, useState } from 'react';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { useDarkMode } from './DarkModeContext';
import { getTheme, palette } from '../theme';

/**
 * App theme — delegates to the canonical theme in `src/theme.js`.
 *
 * Legacy exports (`gradients`, `glassMorphism`, `neumorphism`) are kept so
 * existing imports still resolve, but they now produce flat, solid styling
 * consistent with the professional design system. No gradients on
 * functional UI, no backdrop blur, no embossed "neumorphism" effects.
 */

const solidsLight = {
  primary: palette.light.primary,
  secondary: palette.light.secondary,
  success: palette.light.success,
  info: palette.light.info,
  warning: palette.light.warning,
  error: palette.light.error,
  subtle: palette.light.bgSubtle,
  surface: palette.light.bgPaper,
  text: palette.light.textPrimary,
};

const solidsDark = {
  primary: palette.dark.primary,
  secondary: palette.dark.secondary,
  success: palette.dark.success,
  info: palette.dark.info,
  warning: palette.dark.warning,
  error: palette.dark.error,
  subtle: palette.dark.bgSubtle,
  surface: palette.dark.bgPaper,
  text: palette.dark.textPrimary,
};

/**
 * `gradients` is retained for source-compatibility. Each key returns a solid
 * color string so existing `background: gradients.primary` usage resolves to
 * a flat color instead of a linear-gradient.
 */
export const gradients = {
  primary: solidsLight.primary,
  success: solidsLight.success,
  info: solidsLight.info,
  warning: solidsLight.warning,
  dark: solidsLight.text,
  ocean: solidsLight.info,
  sunset: solidsLight.warning,
  forest: solidsLight.success,
  gold: solidsLight.warning,
  purple: solidsLight.secondary,
  blue: solidsLight.primary,
  green: solidsLight.success,
  red: solidsLight.error,
  orange: solidsLight.warning,
  midnight: solidsLight.text,
  space: solidsLight.text,
  deep: solidsLight.primary,
  night: solidsLight.text,
};

const paperStyle = (mode) => {
  const c = mode === 'dark' ? palette.dark : palette.light;
  return {
    background: c.bgPaper,
    backdropFilter: 'none',
    border: `1px solid ${c.border}`,
    boxShadow: 'none',
  };
};

export const glassMorphism = {
  light: paperStyle('light'),
  dark: paperStyle('dark'),
};

export const neumorphism = {
  light: { background: palette.light.bgPaper, boxShadow: 'none' },
  dark: { background: palette.dark.bgPaper, boxShadow: 'none' },
};

const AppThemeContext = createContext(null);

export const useAppTheme = () => {
  const context = useContext(AppThemeContext);
  if (!context) {
    throw new Error('useAppTheme must be used within AppThemeProvider');
  }
  return context;
};

export const AppThemeProvider = ({ children }) => {
  const { darkMode, toggleDarkMode } = useDarkMode();
  const [themeColor, setThemeColor] = useState('primary');

  const theme = useMemo(() => getTheme(darkMode ? 'dark' : 'light'), [darkMode]);

  const value = useMemo(
    () => ({
      darkMode,
      toggleDarkMode,
      theme,
      gradients,
      glassMorphism: darkMode ? glassMorphism.dark : glassMorphism.light,
      neumorphism: darkMode ? neumorphism.dark : neumorphism.light,
      solids: darkMode ? solidsDark : solidsLight,
      themeColor,
      setThemeColor,
    }),
    [darkMode, toggleDarkMode, theme, themeColor]
  );

  return (
    <AppThemeContext.Provider value={value}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </AppThemeContext.Provider>
  );
};

export default AppThemeProvider;
