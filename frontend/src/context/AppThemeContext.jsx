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

// Glass morphism effects
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
        primary: darkMode ? '#e2e8f0' : '#2d3748',
        secondary: darkMode ? '#a0aec0' : '#4a5568',
        disabled: darkMode ? '#718096' : '#a0aec0'
      }
    },
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      h1: {
        fontSize: '3rem',
        fontWeight: 800,
        letterSpacing: '-0.02em',
        background: darkMode ? gradients.blue : gradients.primary,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text'
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
            ...(darkMode ? glassMorphism.dark : glassMorphism.light),
            transition: 'all 0.3s ease'
          }
        }
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            ...(darkMode ? glassMorphism.dark : glassMorphism.light),
            transition: 'all 0.3s ease',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: darkMode
                ? '0 20px 40px -10px rgba(0, 0, 0, 0.5)'
                : '0 20px 40px -10px rgba(102, 126, 234, 0.3)'
            }
          }
        }
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            fontWeight: 600,
            ...(darkMode
              ? { background: 'rgba(102, 126, 234, 0.15)' }
              : { background: 'rgba(102, 126, 234, 0.1)' })
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
            ...(darkMode
              ? { background: 'rgba(26, 26, 53, 0.6)' }
              : { background: 'rgba(248, 250, 252, 0.8)' })
          },
          indicator: {
            height: 3,
            borderRadius: 3,
            background: gradients.primary
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
            '&.Mui-selected': {
              color: darkMode ? '#667eea' : '#764ba2'
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
            ...(darkMode ? glassMorphism.dark : glassMorphism.light)
          }
        }
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            borderRadius: 8,
            fontSize: '0.85rem',
            ...(darkMode ? glassMorphism.dark : glassMorphism.light)
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