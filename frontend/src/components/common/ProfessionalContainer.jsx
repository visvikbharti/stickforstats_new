/**
 * ProfessionalContainer Component
 * ================================
 * Standardized container wrapper that provides Professional UI features
 * to all statistical modules for consistency.
 *
 * Features:
 * - Dark mode support with toggle
 * - Professional gradients
 * - Glass morphism effects
 * - Smooth animations
 * - Consistent styling
 *
 * IMPORTANT: All statistical modules MUST use this container
 * to ensure UI consistency across the application.
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  IconButton,
  Tooltip,
  Paper,
  Fade,
  Zoom,
  ThemeProvider,
  createTheme,
  CssBaseline,
  alpha,
  useTheme
} from '@mui/material';
import {
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon
} from '@mui/icons-material';
import { useAppTheme } from '../../context/AppThemeContext';

// Professional gradients for consistent theming
export const gradients = {
  primary: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  success: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  info: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  warning: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  dark: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
  ocean: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
  sunset: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
  forest: 'linear-gradient(135deg, #96e6a1 0%, #4bc0c8 100%)',
  night: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)',
  space: 'linear-gradient(135deg, #000428 0%, #004e92 100%)'
};

// Glass morphism styles for beautiful cards
export const glassMorphism = {
  light: {
    background: 'rgba(255, 255, 255, 0.25)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.18)',
    boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)'
  },
  dark: {
    background: 'rgba(17, 25, 40, 0.75)',
    backdropFilter: 'blur(16px) saturate(180%)',
    border: '1px solid rgba(255, 255, 255, 0.125)',
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
  }
};

// Neumorphism styles for depth effect
export const neumorphism = {
  light: {
    background: 'linear-gradient(145deg, #f0f0f3, #cacace)',
    boxShadow: '20px 20px 60px #bebebe, -20px -20px 60px #ffffff'
  },
  dark: {
    background: 'linear-gradient(145deg, #1e1e1e, #2d2d2d)',
    boxShadow: '20px 20px 60px #1a1a1a, -20px -20px 60px #323232'
  }
};

const ProfessionalContainer = ({
  children,
  title,
  gradient = 'primary',
  showDarkModeToggle = true,
  showFullscreen = true,
  maxWidth = 'xl',
  disableGutters = false,
  enableGlassMorphism = true,
  enableNeumorphism = false,
  customActions = null
}) => {
  // Try to use global theme context, fallback to local state
  const globalTheme = React.useContext(React.createContext(null));
  const [localDarkMode, setLocalDarkMode] = useState(() => {
    const saved = localStorage.getItem('professionalDarkMode');
    return saved ? JSON.parse(saved) : false;
  });

  const [isFullscreen, setIsFullscreen] = useState(false);

  // Use global dark mode if available, otherwise use local
  const darkMode = globalTheme?.darkMode ?? localDarkMode;
  const setDarkMode = globalTheme?.setDarkMode ?? setLocalDarkMode;

  // Save dark mode preference
  useEffect(() => {
    if (!globalTheme) {
      localStorage.setItem('professionalDarkMode', JSON.stringify(localDarkMode));
    }
  }, [localDarkMode, globalTheme]);

  // Create professional theme
  const professionalTheme = createTheme({
    palette: {
      mode: darkMode ? 'dark' : 'light',
      primary: {
        main: '#667eea',
        light: '#8b9dc3',
        dark: '#4a5fc1',
        contrastText: '#ffffff'
      },
      secondary: {
        main: '#764ba2',
        light: '#9c6bc8',
        dark: '#5a3778',
        contrastText: '#ffffff'
      },
      success: {
        main: '#48bb78',
        light: '#68d391',
        dark: '#38a169'
      },
      warning: {
        main: '#f6ad55',
        light: '#f6e05e',
        dark: '#dd6b20'
      },
      error: {
        main: '#f56565',
        light: '#fc8181',
        dark: '#e53e3e'
      },
      background: {
        default: darkMode ? '#0a0e27' : '#f8f9fa',
        paper: darkMode ? '#1a1f3a' : '#ffffff',
      },
      text: {
        primary: darkMode ? '#e0e0e0' : '#2d3748',
        secondary: darkMode ? '#a0a0a0' : '#718096'
      }
    },
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      h1: { fontWeight: 700 },
      h2: { fontWeight: 600 },
      h3: { fontWeight: 600 },
      h4: {
        fontWeight: 600,
        background: darkMode ? gradients.night : gradients[gradient],
        backgroundClip: 'text',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
      },
      h5: { fontWeight: 500 },
      h6: { fontWeight: 500 }
    },
    shape: {
      borderRadius: 16
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            textTransform: 'none',
            fontWeight: 600,
            padding: '10px 24px',
            transition: 'all 0.3s ease'
          },
          contained: {
            boxShadow: '0 4px 6px rgba(50, 50, 93, 0.11), 0 1px 3px rgba(0, 0, 0, 0.08)',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: '0 7px 14px rgba(50, 50, 93, 0.1), 0 3px 6px rgba(0, 0, 0, 0.08)'
            }
          }
        }
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            ...(enableGlassMorphism ? glassMorphism[darkMode ? 'dark' : 'light'] : {}),
            ...(enableNeumorphism ? neumorphism[darkMode ? 'dark' : 'light'] : {}),
            transition: 'all 0.3s ease'
          }
        }
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            ...(enableGlassMorphism ? glassMorphism[darkMode ? 'dark' : 'light'] : {})
          }
        }
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            fontWeight: 600
          }
        }
      }
    }
  });

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  return (
    <ThemeProvider theme={professionalTheme}>
      <CssBaseline />
      <Box
        sx={{
          minHeight: '100vh',
          background: darkMode ? gradients.night : gradients[gradient],
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: darkMode
              ? 'radial-gradient(circle at 20% 50%, rgba(102, 126, 234, 0.1) 0%, transparent 50%)'
              : 'radial-gradient(circle at 80% 50%, rgba(118, 75, 162, 0.1) 0%, transparent 50%)',
            pointerEvents: 'none'
          }
        }}
      >
        {/* Action Buttons */}
        <Box
          sx={{
            position: 'fixed',
            top: 20,
            right: 20,
            zIndex: 1000,
            display: 'flex',
            gap: 1
          }}
        >
          {customActions}

          {showFullscreen && (
            <Tooltip title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}>
              <IconButton
                onClick={toggleFullscreen}
                sx={{
                  background: alpha(professionalTheme.palette.primary.main, 0.1),
                  backdropFilter: 'blur(10px)',
                  '&:hover': {
                    background: alpha(professionalTheme.palette.primary.main, 0.2),
                    transform: 'rotate(180deg)',
                    transition: 'all 0.3s ease'
                  }
                }}
              >
                {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
              </IconButton>
            </Tooltip>
          )}

          {showDarkModeToggle && (
            <Tooltip title="Toggle Dark Mode">
              <IconButton
                onClick={() => setDarkMode(!darkMode)}
                sx={{
                  background: alpha(professionalTheme.palette.primary.main, 0.1),
                  backdropFilter: 'blur(10px)',
                  '&:hover': {
                    background: alpha(professionalTheme.palette.primary.main, 0.2),
                    transform: 'rotate(180deg)',
                    transition: 'all 0.3s ease'
                  }
                }}
              >
                {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
              </IconButton>
            </Tooltip>
          )}
        </Box>

        {/* Main Content */}
        <Container
          maxWidth={maxWidth}
          disableGutters={disableGutters}
          sx={{
            pt: 4,
            pb: 4,
            position: 'relative',
            zIndex: 1
          }}
        >
          <Fade in timeout={800}>
            <Box>
              {/* Title with gradient effect */}
              {title && (
                <Zoom in timeout={600}>
                  <Box sx={{ mb: 4, textAlign: 'center' }}>
                    {title}
                  </Box>
                </Zoom>
              )}

              {/* Children content with animation */}
              <Fade in timeout={1000}>
                <Box>
                  {children}
                </Box>
              </Fade>
            </Box>
          </Fade>
        </Container>

        {/* Decorative elements */}
        <Box
          sx={{
            position: 'fixed',
            bottom: -100,
            left: -100,
            width: 300,
            height: 300,
            borderRadius: '50%',
            background: darkMode
              ? 'radial-gradient(circle, rgba(102, 126, 234, 0.2) 0%, transparent 70%)'
              : 'radial-gradient(circle, rgba(118, 75, 162, 0.2) 0%, transparent 70%)',
            filter: 'blur(40px)',
            pointerEvents: 'none'
          }}
        />
        <Box
          sx={{
            position: 'fixed',
            top: -100,
            right: -100,
            width: 300,
            height: 300,
            borderRadius: '50%',
            background: darkMode
              ? 'radial-gradient(circle, rgba(118, 75, 162, 0.2) 0%, transparent 70%)'
              : 'radial-gradient(circle, rgba(102, 126, 234, 0.2) 0%, transparent 70%)',
            filter: 'blur(40px)',
            pointerEvents: 'none'
          }}
        />
      </Box>
    </ThemeProvider>
  );
};

export default ProfessionalContainer;