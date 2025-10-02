import { createTheme } from '@mui/material/styles';

// Enterprise SPSS/SAS-style theme configuration with dense UI and 13px fonts
const getDesignTokens = (mode) => ({
  palette: {
    mode,
    ...(mode === 'light'
      ? {
          // Light mode - Enterprise SPSS-style colors
          primary: {
            main: '#1976d2',
            light: '#42a5f5',
            dark: '#1565c0',
            contrastText: '#ffffff',
          },
          secondary: {
            main: '#9c27b0',
            light: '#ba68c8',
            dark: '#7b1fa2',
            contrastText: '#ffffff',
          },
          background: {
            default: '#f5f5f5',
            paper: '#ffffff',
            secondary: '#fafafa',
          },
          text: {
            primary: '#212121',
            secondary: '#757575',
            disabled: '#bdbdbd',
          },
          divider: '#e0e0e0',
          action: {
            hover: '#f5f5f5',
            selected: '#e3f2fd',
            disabled: '#fafafa',
          },
          error: {
            main: '#d32f2f',
            light: '#ef5350',
            dark: '#c62828',
          },
          warning: {
            main: '#ed6c02',
            light: '#ff9800',
            dark: '#e65100',
          },
          info: {
            main: '#0288d1',
            light: '#03a9f4',
            dark: '#01579b',
          },
          success: {
            main: '#2e7d32',
            light: '#4caf50',
            dark: '#1b5e20',
          },
        }
      : {
          // Dark mode - Enterprise dark theme
          primary: {
            main: '#90caf9',
            light: '#bbdefb',
            dark: '#42a5f5',
            contrastText: '#000000',
          },
          secondary: {
            main: '#ce93d8',
            light: '#f3e5f5',
            dark: '#ab47bc',
            contrastText: '#000000',
          },
          background: {
            default: '#121212',
            paper: '#1e1e1e',
            secondary: '#2d2d2d',
          },
          text: {
            primary: '#ffffff',
            secondary: '#b3b3b3',
            disabled: '#666666',
          },
          divider: '#3d3d3d',
          action: {
            hover: '#2d2d2d',
            selected: '#1976d2',
            disabled: '#1a1a1a',
          },
          error: {
            main: '#f44336',
            light: '#e57373',
            dark: '#d32f2f',
          },
          warning: {
            main: '#ffa726',
            light: '#ffb74d',
            dark: '#f57c00',
          },
          info: {
            main: '#29b6f6',
            light: '#4fc3f7',
            dark: '#0277bd',
          },
          success: {
            main: '#66bb6a',
            light: '#81c784',
            dark: '#388e3c',
          },
        }),
  },
  typography: {
    // Enterprise 13px base font size - SPSS/SAS style
    fontSize: 13,
    fontFamily: [
      'Segoe UI',
      'Roboto',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
    h1: {
      fontSize: '2.0rem',
      fontWeight: 500,
      lineHeight: 1.2,
    },
    h2: {
      fontSize: '1.75rem',
      fontWeight: 500,
      lineHeight: 1.2,
    },
    h3: {
      fontSize: '1.5rem',
      fontWeight: 500,
      lineHeight: 1.3,
    },
    h4: {
      fontSize: '1.25rem',
      fontWeight: 500,
      lineHeight: 1.3,
    },
    h5: {
      fontSize: '1.125rem',
      fontWeight: 500,
      lineHeight: 1.4,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 500,
      lineHeight: 1.4,
    },
    subtitle1: {
      fontSize: '1rem',
      fontWeight: 400,
      lineHeight: 1.5,
    },
    subtitle2: {
      fontSize: '0.875rem',
      fontWeight: 500,
      lineHeight: 1.5,
    },
    body1: {
      fontSize: '0.875rem', // 14px
      fontWeight: 400,
      lineHeight: 1.5,
    },
    body2: {
      fontSize: '0.8125rem', // 13px
      fontWeight: 400,
      lineHeight: 1.43,
    },
    caption: {
      fontSize: '0.75rem', // 12px
      fontWeight: 400,
      lineHeight: 1.66,
    },
    button: {
      fontSize: '0.8125rem', // 13px
      fontWeight: 500,
      textTransform: 'none', // Enterprise style - no uppercase
    },
    overline: {
      fontSize: '0.75rem',
      fontWeight: 400,
      textTransform: 'uppercase',
      lineHeight: 2.66,
    },
  },
  spacing: 8, // Default MUI spacing
  shape: {
    borderRadius: 4, // Slightly rounded corners for enterprise feel
  },
});

// Dense component configurations for enterprise UI
const getComponentOverrides = (mode) => ({
  MuiCssBaseline: {
    styleOverrides: {
      body: {
        fontSize: '13px', // Base 13px font size
        fontFamily: 'Segoe UI, Roboto, -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif',
      },
    },
  },
  MuiButton: {
    styleOverrides: {
      root: {
        textTransform: 'none',
        fontSize: '13px',
        minHeight: '32px',
        padding: '6px 12px',
      },
      sizeSmall: {
        fontSize: '12px',
        padding: '4px 8px',
        minHeight: '28px',
      },
      sizeLarge: {
        fontSize: '14px',
        padding: '8px 16px',
        minHeight: '36px',
      },
    },
    defaultProps: {
      size: 'small',
      disableElevation: true, // Flat design for enterprise
    },
  },
  MuiTextField: {
    styleOverrides: {
      root: {
        '& .MuiInputBase-input': {
          fontSize: '13px',
          padding: '8px 12px',
        },
        '& .MuiInputLabel-root': {
          fontSize: '13px',
        },
        '& .MuiFormHelperText-root': {
          fontSize: '11px',
        },
      },
    },
    defaultProps: {
      size: 'small',
      variant: 'outlined',
    },
  },
  MuiTable: {
    styleOverrides: {
      root: {
        fontSize: '13px',
      },
    },
  },
  MuiTableCell: {
    styleOverrides: {
      root: {
        fontSize: '13px',
        padding: '6px 16px', // Dense padding
        borderBottom: mode === 'dark' ? '1px solid #3d3d3d' : '1px solid #e0e0e0',
      },
      head: {
        fontWeight: 600,
        backgroundColor: mode === 'dark' ? '#2d2d2d' : '#fafafa',
      },
    },
  },
  MuiTableRow: {
    styleOverrides: {
      root: {
        '&:hover': {
          backgroundColor: mode === 'dark' ? '#2d2d2d' : '#f5f5f5',
        },
      },
    },
  },
  MuiChip: {
    styleOverrides: {
      root: {
        fontSize: '12px',
        height: '24px',
      },
      label: {
        fontSize: '12px',
        padding: '0 8px',
      },
    },
    defaultProps: {
      size: 'small',
    },
  },
  MuiTabs: {
    styleOverrides: {
      root: {
        minHeight: '36px',
        '& .MuiTab-root': {
          fontSize: '13px',
          minHeight: '36px',
          textTransform: 'none',
          padding: '6px 12px',
        },
      },
    },
  },
  MuiList: {
    styleOverrides: {
      root: {
        padding: '4px 0',
      },
    },
    defaultProps: {
      dense: true,
    },
  },
  MuiListItem: {
    styleOverrides: {
      root: {
        paddingTop: '4px',
        paddingBottom: '4px',
        fontSize: '13px',
      },
    },
    defaultProps: {
      dense: true,
    },
  },
  MuiListItemText: {
    styleOverrides: {
      primary: {
        fontSize: '13px',
      },
      secondary: {
        fontSize: '11px',
      },
    },
  },
  MuiAppBar: {
    styleOverrides: {
      root: {
        boxShadow: mode === 'dark' 
          ? '0px 2px 4px rgba(0,0,0,0.3)' 
          : '0px 2px 4px rgba(0,0,0,0.1)',
      },
    },
  },
  MuiToolbar: {
    styleOverrides: {
      root: {
        minHeight: '48px !important', // Dense toolbar
        padding: '0 16px !important',
      },
    },
    defaultProps: {
      variant: 'dense',
    },
  },
  MuiFormControl: {
    defaultProps: {
      size: 'small',
      margin: 'dense',
    },
  },
  MuiSelect: {
    defaultProps: {
      size: 'small',
    },
  },
  MuiCheckbox: {
    styleOverrides: {
      root: {
        padding: '4px',
      },
    },
    defaultProps: {
      size: 'small',
    },
  },
  MuiRadio: {
    styleOverrides: {
      root: {
        padding: '4px',
      },
    },
    defaultProps: {
      size: 'small',
    },
  },
  MuiSwitch: {
    defaultProps: {
      size: 'small',
    },
  },
  MuiIconButton: {
    styleOverrides: {
      root: {
        padding: '6px',
      },
    },
    defaultProps: {
      size: 'small',
    },
  },
  MuiCard: {
    styleOverrides: {
      root: {
        boxShadow: mode === 'dark' 
          ? '0 2px 8px rgba(0,0,0,0.3)' 
          : '0 2px 8px rgba(0,0,0,0.1)',
      },
    },
  },
  MuiCardContent: {
    styleOverrides: {
      root: {
        padding: '12px',
        '&:last-child': {
          paddingBottom: '12px',
        },
      },
    },
  },
  MuiDialog: {
    styleOverrides: {
      paper: {
        fontSize: '13px',
      },
    },
  },
  MuiDialogTitle: {
    styleOverrides: {
      root: {
        fontSize: '16px',
        fontWeight: 500,
        padding: '16px',
      },
    },
  },
  MuiDialogContent: {
    styleOverrides: {
      root: {
        fontSize: '13px',
        padding: '8px 16px',
      },
    },
  },
  MuiDialogActions: {
    styleOverrides: {
      root: {
        padding: '8px 16px 16px',
      },
    },
  },
});

export const getTheme = (mode) => {
  const tokens = getDesignTokens(mode);
  
  return createTheme({
    ...tokens,
    components: getComponentOverrides(mode),
  });
};

export default getTheme;