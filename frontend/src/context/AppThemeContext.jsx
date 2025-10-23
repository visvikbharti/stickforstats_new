import React, { createContext, useState, useContext } from 'react';
import { createTheme, ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { useDarkMode } from './DarkModeContext';

// Professional gradient schemes
export const gradients = {
  primary: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  success: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  info: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  warning: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  dark: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
  ocean: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
  sunset: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
  forest: 'linear-gradient(135deg, #96e6a1 0%, #4bc0c8 100%)',
  gold: 'linear-gradient(135deg, #ffd89b 0%, #19547b 100%)',
  purple: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
  blue: 'linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)',
  green: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  red: 'linear-gradient(135deg, #ff6e7f 0%, #bfe9ff 100%)',
  orange: 'linear-gradient(135deg, #f46b45 0%, #eea849 100%)',
  midnight: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)',
  space: 'linear-gradient(135deg, #000428 0%, #004e92 100%)',
  deep: 'linear-gradient(135deg, #1a2980 0%, #26d0ce 100%)'
};

// Glass morphism effects - ENHANCED FOR ACCESSIBILITY
// Reduced transparency for better contrast and readability
export const glassMorphism = {
  light: {
    background: 'rgba(255, 255, 255, 0.95)', // Changed from 0.25 to 0.95 for solid appearance
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(102, 126, 234, 0.15)', // Subtle primary color border
    boxShadow: '0 2px 12px 0 rgba(0, 0, 0, 0.08)' // Softer shadow for better readability
  },
  dark: {
    background: 'rgba(26, 26, 53, 0.98)', // Changed from 0.75 to 0.98 for near-solid appearance
    backdropFilter: 'blur(16px) saturate(180%)',
    border: '1px solid rgba(102, 126, 234, 0.25)', // Visible border in dark mode
    boxShadow: '0 4px 20px 0 rgba(0, 0, 0, 0.5)' // Stronger shadow for depth
  }
};

// Neumorphism effects
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

const AppThemeContext = createContext();

export const useAppTheme = () => {
  const context = useContext(AppThemeContext);
  if (!context) {
    throw new Error('useAppTheme must be used within AppThemeProvider');
  }
  return context;
};

export const AppThemeProvider = ({ children }) => {
  // Use dark mode from DarkModeContext instead of maintaining separate state
  const { darkMode, toggleDarkMode: toggleDarkModeContext } = useDarkMode();

  const [themeColor, setThemeColor] = useState('primary');

  const theme = createTheme({
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
      info: {
        main: '#4299e1',
        light: '#63b3ed',
        dark: '#3182ce'
      },
      background: darkMode
        ? {
            default: '#0f0f23',
            paper: '#1a1a35',
            gradient: gradients.midnight
          }
        : {
            default: '#f7fafc',
            paper: '#ffffff',
            gradient: gradients.primary
          },
      text: {
        // ENHANCED CONTRAST - WCAG AA Compliant (4.5:1 minimum)
        primary: darkMode ? '#f7fafc' : '#1a202c', // Increased contrast from #e2e8f0 / #2d3748
        secondary: darkMode ? '#cbd5e0' : '#4a5568', // Increased contrast from #a0aec0
        disabled: darkMode ? '#a0aec0' : '#718096' // Swapped for better visibility
      }
    },
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      h1: {
        fontSize: '3rem',
        fontWeight: 800,
        letterSpacing: '-0.02em',
        // ENHANCED FOR ACCESSIBILITY - Solid color with optional gradient on hover
        color: darkMode ? '#90caf9' : '#667eea', // Fallback solid color for accessibility
        // Note: Gradient text removed to prevent invisibility issues
        // Can be re-added as hover effect in specific components if needed
      },
      h2: {
        fontSize: '2.5rem',
        fontWeight: 700,
        letterSpacing: '-0.01em'
      },
      h3: {
        fontSize: '2rem',
        fontWeight: 600
      },
      h4: {
        fontSize: '1.75rem',
        fontWeight: 600
      },
      h5: {
        fontSize: '1.5rem',
        fontWeight: 500
      },
      h6: {
        fontSize: '1.25rem',
        fontWeight: 500
      },
      body1: {
        fontSize: '1rem',
        lineHeight: 1.7
      },
      body2: {
        fontSize: '0.875rem',
        lineHeight: 1.6
      },
      button: {
        textTransform: 'none',
        fontWeight: 600,
        letterSpacing: '0.02em'
      }
    },
    shape: {
      borderRadius: 12
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            padding: '8px 20px',
            fontSize: '0.95rem',
            boxShadow: 'none',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: '0 8px 20px -6px rgba(102, 126, 234, 0.4)'
            }
          },
          contained: {
            background: gradients.primary,
            color: '#ffffff',
            '&:hover': {
              background: gradients.purple
            }
          }
        }
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            // ENHANCED: Use solid backgrounds for critical UI elements with subtle glass effect
            backgroundColor: darkMode ? '#1a1a35' : '#ffffff',
            border: darkMode ? '1px solid rgba(102, 126, 234, 0.25)' : '1px solid rgba(102, 126, 234, 0.15)',
            boxShadow: darkMode
              ? '0 4px 20px 0 rgba(0, 0, 0, 0.5)'
              : '0 2px 12px 0 rgba(0, 0, 0, 0.08)',
            transition: 'all 0.3s ease'
          }
        }
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            // ENHANCED: Solid background with subtle border for better contrast
            backgroundColor: darkMode ? '#1a1a35' : '#ffffff',
            border: darkMode ? '1px solid rgba(102, 126, 234, 0.3)' : '1px solid rgba(102, 126, 234, 0.12)',
            boxShadow: darkMode
              ? '0 4px 20px 0 rgba(0, 0, 0, 0.4)'
              : '0 2px 12px 0 rgba(0, 0, 0, 0.08)',
            transition: 'all 0.3s ease',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: darkMode
                ? '0 20px 40px -10px rgba(0, 0, 0, 0.6)'
                : '0 20px 40px -10px rgba(102, 126, 234, 0.25)',
              borderColor: darkMode ? 'rgba(102, 126, 234, 0.5)' : 'rgba(102, 126, 234, 0.25)'
            }
          }
        }
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            fontWeight: 600,
            // ENHANCED: Better contrast and visibility for chips
            backgroundColor: darkMode ? 'rgba(102, 126, 234, 0.2)' : 'rgba(102, 126, 234, 0.12)',
            color: darkMode ? '#cbd5e0' : '#2d3748',
            border: darkMode ? '1px solid rgba(102, 126, 234, 0.3)' : '1px solid rgba(102, 126, 234, 0.15)',
            '&:hover': {
              backgroundColor: darkMode ? 'rgba(102, 126, 234, 0.3)' : 'rgba(102, 126, 234, 0.18)'
            }
          }
        }
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 8,
              transition: 'all 0.3s ease',
              '&:hover': {
                boxShadow: '0 0 0 2px rgba(102, 126, 234, 0.1)'
              },
              '&.Mui-focused': {
                boxShadow: '0 0 0 3px rgba(102, 126, 234, 0.15)'
              }
            }
          }
        }
      },
      MuiTabs: {
        styleOverrides: {
          root: {
            minHeight: 48,
            borderRadius: 12,
            // ENHANCED: Solid background for better tab visibility
            backgroundColor: darkMode ? '#1a1a35' : '#f8fafb',
            border: darkMode ? '1px solid rgba(102, 126, 234, 0.2)' : '1px solid rgba(102, 126, 234, 0.1)',
            boxShadow: darkMode
              ? '0 2px 8px rgba(0, 0, 0, 0.3)'
              : '0 1px 4px rgba(0, 0, 0, 0.05)'
          },
          indicator: {
            height: 3,
            borderRadius: 3,
            backgroundColor: darkMode ? '#667eea' : '#764ba2' // Solid color instead of gradient
          }
        }
      },
      MuiTab: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '0.95rem',
            marginRight: 8,
            // ENHANCED: Better text contrast for tabs
            color: darkMode ? '#cbd5e0' : '#4a5568',
            '&.Mui-selected': {
              color: darkMode ? '#90caf9' : '#667eea', // More vibrant selected color
              fontWeight: 700 // Bolder when selected
            },
            '&:hover': {
              color: darkMode ? '#e2e8f0' : '#2d3748',
              backgroundColor: darkMode ? 'rgba(102, 126, 234, 0.1)' : 'rgba(102, 126, 234, 0.05)'
            }
          }
        }
      },
      MuiLinearProgress: {
        styleOverrides: {
          root: {
            height: 8,
            borderRadius: 4,
            backgroundColor: darkMode
              ? 'rgba(102, 126, 234, 0.15)'
              : 'rgba(102, 126, 234, 0.1)'
          },
          bar: {
            borderRadius: 4,
            background: gradients.primary
          }
        }
      },
      MuiAlert: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            // ENHANCED: Solid backgrounds for alerts - critical information must be readable
            border: darkMode ? '1px solid rgba(102, 126, 234, 0.3)' : '1px solid rgba(102, 126, 234, 0.15)',
            boxShadow: darkMode
              ? '0 2px 8px rgba(0, 0, 0, 0.3)'
              : '0 2px 8px rgba(0, 0, 0, 0.08)',
            '& .MuiAlert-message': {
              color: darkMode ? '#f7fafc' : '#1a202c' // High contrast text
            }
          }
        }
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            borderRadius: 8,
            fontSize: '0.85rem',
            // ENHANCED: Solid tooltip background for readability
            backgroundColor: darkMode ? '#2d2d50' : '#2d3748',
            color: '#ffffff',
            border: darkMode ? '1px solid rgba(144, 202, 249, 0.5)' : 'none',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)'
          }
        }
      },
      MuiFab: {
        styleOverrides: {
          root: {
            background: gradients.primary,
            color: '#ffffff',
            '&:hover': {
              background: gradients.purple,
              transform: 'rotate(90deg) scale(1.1)'
            },
            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
          }
        }
      }
    }
  });

  const value = {
    darkMode,
    toggleDarkMode: toggleDarkModeContext,
    theme,
    gradients,
    glassMorphism: darkMode ? glassMorphism.dark : glassMorphism.light,
    neumorphism: darkMode ? neumorphism.dark : neumorphism.light,
    themeColor,
    setThemeColor
  };

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